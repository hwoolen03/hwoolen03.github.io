# BUILD

package(default_visibility = ["//visibility:public"])

load("@npm_bazel_typescript//:index.bzl", "ts_library")

ts_library(
    name = "tfjs-backend-cpu_pkg",
    srcs = glob(["src/**/*.ts"]),
    deps = [
        "@npm//@tensorflow/tfjs-core",
        "@npm//@types/seedrandom",
        "@npm//seedrandom",
    ],
)
