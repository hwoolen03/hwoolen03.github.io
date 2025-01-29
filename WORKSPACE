workspace(name = "Atlas")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# Official rules_nodejs (v5.8.2)
http_archive(
    name = "rules_nodejs",
    sha256 = "d14076339deb08e5460c221fae5c5e9605d2ef4848eee1f0c81c9ffdc1ab31c1",
    strip_prefix = "rules_nodejs-5.8.2",
    url = "https://github.com/bazelbuild/rules_nodejs/releases/download/v5.8.2/rules_nodejs-core-5.8.2.tar.gz",
)

# Node.js toolchain
load("@rules_nodejs//nodejs:repositories.bzl", "nodejs_register_toolchains")
nodejs_register_toolchains(
    name = "nodejs",
    node_version = "18.16.0",  # Match your Node.js version
)

# Install npm dependencies
load("@rules_nodejs//nodejs:repositories.bzl", "npm_install")
npm_install(
    name = "npm",
    package_json = "//:package.json",
    package_lock_json = "//:package-lock.json",
)
