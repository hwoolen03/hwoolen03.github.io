# BUILD

package(default_visibility = ["//visibility:public"])

load("@rules_ts//:defs.bzl", "ts_project")

# Define a TypeScript project
ts_project(
    name = "tfjs-backend-cpu_pkg",
    srcs = glob(["src/**/*.ts"]),
    deps = [
        "@npm//@tensorflow/tfjs-core",
        "@npm//@types/seedrandom",
        "@npm//seedrandom",
    ],
)
