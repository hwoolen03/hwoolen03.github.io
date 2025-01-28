# WORKSPACE file

# Load npm_install rule from rules_nodejs
load("@rules_nodejs//:index.bzl", "npm_install")

# Define npm dependencies
npm_install(
    name = "npm_deps",
    package_json = "//:package.json",
    package_lock_json = "//:package-lock.json",
)
