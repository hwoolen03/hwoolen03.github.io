workspace(name = "Atlas")

# Use OFFICIAL rules_nodejs (not bazel-contrib fork)
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "rules_nodejs",
    sha256 = "7a4c4bfe6f0e9f8acad301633a0cbef133f0a0c8321fda7e621a9340a4a1d774",  # SHA for 6.3.3
    strip_prefix = "rules_nodejs-6.3.3",
    url = "https://github.com/bazelbuild/rules_nodejs/releases/download/v6.3.3/rules_nodejs-v6.3.3.tar.gz",
)

# Set up Node.js and npm
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
