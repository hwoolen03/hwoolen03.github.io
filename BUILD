load("@npm//@bazel/typescript:index.bzl", "ts_project")
load("@aspect_rules_js//npm:extensions.bzl", "npm")

ts_project(
    name = "tfjs-backend-cpu_pkg",
    srcs = glob(["src/**/*.ts"]),
    deps = [
        "@npm//@tensorflow/tfjs-core",
        "@npm//@types/seedrandom",
        "@npm//seedrandom",
    ],
    declaration = True,
    tsconfig = "//:tsconfig.json",
)

npm.npm_translate_lock(
    name = "npm",
    npm_lock = "//:package-lock.json",
    package_json = "//:package.json",
)

use_repo(npm, "npm")
