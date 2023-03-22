# apiVersionMismatch

The sourceApiVersion in sfdx-project.json doesn't match the apiVersion. The commands that deploy and retrieve source use the sourceApiVersion in this case. The version mismatch isn't a problem, as long as it's the behavior you actually want.

# apiVersionUnset

Neither sourceApiVersion nor apiVersion are defined. The commands that deploy and retrieve source use the max apiVersion of the target org in this case. The issue isn't a problem, as long as it's the behavior you actually want.

# maxApiVersionMismatch

The max apiVersion of the default DevHub org doesn't match the max apiVersion of the default target org. This mismatch means that the default target orgs are running different API versions. Be sure you explicitly set the apiVersion when you deploy or retrieve source, or you will likely run into problems.

# sourceApiVersionMaxMismatch

The sourceApiVersion in sfdx-project.json doesn't match the max apiVersion of the default target org. As a result, you're not using the latest features available in API version %s. The version mismatch isn't a problem, as long as it's the behavior you actually want.

# apiVersionMaxMismatch

The apiVersion doesn't match the max apiVersion of the default target org. As a result, you're not using the latest features available in API version %s. The version mismatch isn't a problem, as long as it's the behavior you actually want.
