load("@npm//@bazel/typescript:index.bzl", "ts_project")  # Correct load path

ts_project(
    name = "tfjs-backend-cpu_pkg",
    srcs = glob(["src/**/*.ts"]),
    deps = [
        "@npm//@tensorflow/tfjs-core",
        "@npm//@types/seedrandom",
        "@npm//seedrandom",
    ],
    declaration = True,
    tsconfig = "//:tsconfig.json",  # Add explicit tsconfig
)
