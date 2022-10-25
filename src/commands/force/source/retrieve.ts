/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from "os";
import { join, resolve, dirname } from "path";
import * as fs from "fs";
import { flags, FlagsConfig } from "@salesforce/command";
import { Messages, SfError, SfProject } from "@salesforce/core";
import { Duration } from "@salesforce/kit";
import { ComponentSet, ComponentSetBuilder, RequestStatus, RetrieveResult } from "@salesforce/source-deploy-retrieve";
import { SourceTracking } from "@salesforce/source-tracking";
import { SourceCommand } from "../../../sourceCommand";
import {
  PackageRetrieval,
  RetrieveCommandResult,
  RetrieveResultFormatter
} from "../../../formatters/retrieveResultFormatter";
import { filterConflictsByComponentSet, trackingSetup, updateTracking } from "../../../trackingFunctions";

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages("@salesforce/plugin-source", "retrieve");
const spinnerMessages = Messages.loadMessages("@salesforce/plugin-source", "spinner");

export class Retrieve extends SourceCommand {
  public static readonly description = messages.getMessage("description");
  public static readonly examples = messages.getMessage("examples").split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    retrievetargetdir: flags.directory({
      char: "r",
      description: messages.getMessage("flags.retrievetargetdir"),
      longDescription: messages.getMessage("flagsLong.retrievetargetdir"),
      exclusive: ["packagenames", "sourcepath"]
    }),
    apiversion: flags.builtin({
      /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
      // @ts-ignore force char override for backward compat
      char: "a"
    }),
    sourcepath: flags.array({
      char: "p",
      description: messages.getMessage("flags.sourcePath"),
      longDescription: messages.getMessage("flagsLong.sourcePath"),
      exclusive: ["manifest", "metadata"]
    }),
    wait: flags.minutes({
      char: "w",
      default: Duration.minutes(SourceCommand.DEFAULT_WAIT_MINUTES),
      min: Duration.minutes(1),
      description: messages.getMessage("flags.wait"),
      longDescription: messages.getMessage("flagsLong.wait")
    }),
    manifest: flags.filepath({
      char: "x",
      description: messages.getMessage("flags.manifest"),
      longDescription: messages.getMessage("flagsLong.manifest"),
      exclusive: ["metadata", "sourcepath"]
    }),
    metadata: flags.array({
      char: "m",
      description: messages.getMessage("flags.metadata"),
      longDescription: messages.getMessage("flagsLong.metadata"),
      exclusive: ["manifest", "sourcepath"]
    }),
    packagenames: flags.array({
      char: "n",
      description: messages.getMessage("flags.packagename")
    }),
    tracksource: flags.boolean({
      char: "t",
      description: messages.getMessage("flags.tracksource")
    }),
    forceoverwrite: flags.boolean({
      char: "f",
      description: messages.getMessage("flags.forceoverwrite"),
      dependsOn: ["tracksource"]
    }),
    verbose: flags.builtin({
      description: messages.getMessage("flags.verbose")
    })
  };
  protected readonly lifecycleEventNames = ["preretrieve", "postretrieve"];
  protected retrieveResult: RetrieveResult;
  protected tracking: SourceTracking;

  public async run(): Promise<RetrieveCommandResult> {
    await this.preChecks();
    await this.retrieve();
    this.resolveSuccess();
    await this.maybeUpdateTracking();
    await this.moveResultsForRetrieveTargetDir();
    return this.formatResult();
  }

  protected async preChecks(): Promise<void> {
    // we need something to retrieve
    const retrieveInputs = [this.flags.manifest, this.flags.metadata, this.flags.sourcepath, this.flags.packagenames];
    if (!retrieveInputs.some((x) => x)) {
      throw new SfError(messages.getMessage("nothingToRetrieve"));
    }
    if (this.flags.tracksource) {
      this.tracking = await trackingSetup({
        ux: this.ux,
        org: this.org,
        project: this.project,
        ignoreConflicts: true,
        commandName: "force:source:retrieve"
      });
    }
  }

  protected async retrieve(): Promise<void> {
    this.ux.startSpinner(spinnerMessages.getMessage("retrieve.componentSetBuild"));
    this.componentSet = await ComponentSetBuilder.build({
      apiversion: this.getFlag<string>("apiversion"),
      sourceapiversion: await this.getSourceApiVersion(),
      packagenames: this.getFlag<string[]>("packagenames"),
      sourcepath: this.getFlag<string[]>("sourcepath"),
      manifest: this.flags.manifest && {
        manifestPath: this.getFlag<string>("manifest"),
        directoryPaths: this.flags.retrievetargetdir ? [] : this.getPackageDirs()
      },
      metadata: this.flags.metadata && {
        metadataEntries: this.getFlag<string[]>("metadata"),
        directoryPaths: this.flags.retrievetargetdir ? [] : this.getPackageDirs()
      }
    });

    if (this.getFlag<string>("manifest") || this.getFlag<string>("metadata")) {
      if (this.wantsToRetrieveCustomFields()) {
        this.ux.warn(messages.getMessage("wantsToRetrieveCustomFields"));
        this.componentSet.add({ fullName: ComponentSet.WILDCARD, type: { id: "customobject", name: "CustomObject" } });
      }
    }
    if (this.getFlag<boolean>("tracksource")) {
      // will throw if conflicts exist
      if (!this.getFlag<boolean>("forceoverwrite")) {
        await filterConflictsByComponentSet({ tracking: this.tracking, components: this.componentSet, ux: this.ux });
      }

      const remoteDeletes = await this.tracking.getChanges<string>({
        origin: "remote",
        state: "delete",
        format: "string"
      });
      if (remoteDeletes.length) {
        this.ux.warn(messages.getMessage("retrieveWontDelete"));
      }
    }

    await this.lifecycle.emit("preretrieve", this.componentSet.toArray());

    this.ux.setSpinnerStatus(
      spinnerMessages.getMessage("retrieve.sendingRequest", [
        this.componentSet.sourceApiVersion || this.componentSet.apiVersion
      ])
    );
    const mdapiRetrieve = await this.componentSet.retrieve({
      usernameOrConnection: this.org.getUsername(),
      merge: true,
      output: this.getFlag<string>("retrievetargetdir") || this.project.getDefaultPackage().fullPath,
      packageOptions: this.getFlag<string[]>("packagenames")
    });

    this.ux.setSpinnerStatus(spinnerMessages.getMessage("retrieve.polling"));
    this.retrieveResult = await mdapiRetrieve.pollStatus({ timeout: this.getFlag<Duration>("wait") });

    await this.lifecycle.emit("postretrieve", this.retrieveResult.getFileResponses());
    this.ux.stopSpinner();
  }

  protected resolveSuccess(): void {
    const StatusCodeMap = new Map<RequestStatus, number>([
      [RequestStatus.Succeeded, 0],
      [RequestStatus.Canceled, 1],
      [RequestStatus.Failed, 1],
      [RequestStatus.InProgress, 69],
      [RequestStatus.Pending, 69],
      [RequestStatus.Canceling, 69]
    ]);

    this.setExitCode(StatusCodeMap.get(this.retrieveResult.response.status) ?? 1);
  }

  protected async formatResult(): Promise<RetrieveCommandResult> {
    const packages: PackageRetrieval[] = [];
    const projectPath = await SfProject.resolveProjectPath();

    this.getFlag<string[]>("packagenames", []).forEach((name) => {
      packages.push({ name, path: join(projectPath, name) });
    });

    const formatterOptions = {
      waitTime: this.getFlag<Duration>("wait").quantity,
      verbose: this.getFlag<boolean>("verbose", false),
      packages
    };
    const formatter = new RetrieveResultFormatter(this.logger, this.ux, formatterOptions, this.retrieveResult);

    // Only display results to console when JSON flag is unset.
    if (!this.isJsonOutput()) {
      formatter.display();
    }

    return formatter.getJson();
  }

  private async maybeUpdateTracking(): Promise<void> {
    if (this.getFlag<boolean>("tracksource", false)) {
      return updateTracking({ tracking: this.tracking, result: this.retrieveResult, ux: this.ux });
    }
  }

  private wantsToRetrieveCustomFields(): boolean {
    const hasCustomField = this.componentSet.has({
      type: { name: "CustomField", id: "customfield" },
      fullName: ComponentSet.WILDCARD
    });

    const hasCustomObject = this.componentSet.has({
      type: { name: "CustomObject", id: "customobject" },
      fullName: ComponentSet.WILDCARD
    });
    return hasCustomField && !hasCustomObject;
  }

  private async moveResultsForRetrieveTargetDir(): Promise<void> {
    async function mv(src: string, dest: string): Promise<void> {
      // remove dest if it exists
      try{
        const destStat = await fs.promises.stat(dest);
        if (destStat.isDirectory()) {
          await fs.promises.rmdir(dest, { recursive: true });
        } else {
          await fs.promises.rm(dest, { force: true });
        }
      } catch(err) {
        if ((err as Error)['code'] !== 'ENOENT') {
          throw err;
        }
      }
      const srcStat = await fs.promises.stat(src);
      if (srcStat.isDirectory()) {
        await fs.promises.rename(src, dest);
      } else {
        await fs.promises.mkdir(dirname(dest), { recursive: true });
        await fs.promises.cp(src, dest);
      }
    };

    if (!this.flags.retrievetargetdir) {
      return;
    }
    let overlapsProject = true;
    const resolvedTargetDir = resolve(this.flags.retrievetargetdir as string);
    overlapsProject = !!this.project.getPackageDirectories().find((pkgDir) => {
      if (pkgDir.fullPath) {
        return pkgDir.fullPath.includes(resolvedTargetDir);
      }
      return false;
    });
    if (overlapsProject) {
      return;
    }
    // move contents of 'main/default' to 'retrievetargetdir'
    const contents = await fs.promises.readdir(join(this.flags.retrievetargetdir as string, 'main', 'default'));
    await Promise.all(contents.map((file) => mv(join(this.flags.retrievetargetdir as string, 'main', 'default', file), join(this.flags.retrievetargetdir as string, file))));
    // remove 'main/default'
    await fs.promises.rmdir(join(this.flags.retrievetargetdir as string, 'main'), { recursive: true });
    this.retrieveResult.getFileResponses().forEach((fileResponse) => {
      fileResponse.filePath = fileResponse.filePath.replace(join('main', 'default'), '');
    });
  }
}
