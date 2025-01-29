# WORKSPACE

# Load external repositories
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("@bazel_tools//tools/build_defs/repo:git.bzl", "git_repository")

# Fetch rules_nodejs
http_archive(
    name = "rules_nodejs",
    sha256 = "732aa2aeef9ba629cd7fa1cb30da07e6b696ed78706b08d84d5d8601982f38b1",
    strip_prefix = "rules_nodejs-6.3.3",
    url = "https://github.com/bazel-contrib/rules_nodejs/releases/download/v6.3.3/rules_nodejs-v6.3.3.tar.gz",
)

# Fetch rules_typescript (required for TypeScript support)
http_archive(
    name = "rules_typescript",
    sha256 = "d3f8c1eac1cf57c050fd46bb12511637b8f4e7b9534cb594c7ff937e29088847",
    strip_prefix = "rules_typescript-5.0.0",
    url = "https://github.com/bazelbuild/rules_typescript/releases/download/5.0.0/rules_typescript-5.0.0.tar.gz",
)

# Setup npm (necessary for resolving npm dependencies in BUILD file)
load("@rules_nodejs//nodejs:repositories.bzl", "node_repositories")

# Fetch npm dependencies
node_repositories(
    package_json = "//:package.json",  # Ensure you have a package.json in your workspace
    yarn_lock = "//:yarn.lock",  # Optional, if you're using Yarn for dependency management
)

# Optional: If you're using a specific version of npm packages from GitHub
# git_repository(
#     name = "some_repository",
#     commit = "your_commit_hash",
#     remote = "https://github.com/your_repo/your_project.git",
# )
