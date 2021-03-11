# plugin-source NUTs

In testing the source commands, we have 2 significant problems that needs to be solved:

1. How do we test the commands across the old code (force-com-toolbelt) and the new code (plugin-source)?
2. How do we test the commands across a variety of sfdx projects and metadata?

These problems are solved by generating `.nut.ts` files from `.seed.ts` files using the test matrix exported by `testMatrix.ts`

In practice this means that we generate a `.nut.ts` file for every executable and test repository combination based on the `.seed.ts`. For instance, if we have 5 seeds and if we have 3 test repositories defined in the test matrix, we will generate 30 nuts: 5 seeds * 3 repos * 2 executables (`sfdx` and `bin/run`)

By generating nuts we also maintain the ability the parallelize them since mocha parallelizes tests at the file level. So now we can run those 30 nuts in parallel instead of running them one at a time, which is a huge performance advantage.

However, since we're running the exact same tests on a variety of repositories with different metadata, we have to configure certain aspects so that the tests are meaningful. All the possible configuration is documented in `testMatrix.ts`.

It also means that we're relatively limited in what we can test. For example, it doesn't make sense to write complicated multiple package directory (MPD) tests for repositories that do not have multiple package directories. So that means that the seeds are best used as high-level smoke tests that simply run through the most common use cases and verify json output. **Because of this, we are not locked into to only writing seeds**. It is still entirely possible to write a new `.nut.ts` that lives outside of the test matrix framework.

## Environment Variable Reference
| Name                       | Description                                               | Default |
|----------------------------|-----------------------------------------------------------|---------|
| PLUGIN_SOURCE_SEED_FILTER  | substring of seeds you want to generate                   | NA      |
| PLUGIN_SOURCE_TEST_BIN_RUN | set to true if you want to include the bin/run executable | false   |
| PLUGIN_SOURCE_TEST_SFDX    | set to true if you want to include the sfdx executable    | true    |

