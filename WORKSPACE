# WORKSPACE file

# Fetch rules_nodejs
http_archive(
    name = "rules_nodejs",
    sha256 = "732aa2aeef9ba629cd7fa1cb30da07e6b696ed78706b08d84d5d8601982f38b1",  # Ensure this matches the version you're using
    strip_prefix = "rules_nodejs-6.3.3",  # Match the extracted folder name from the tarball
    url = "https://github.com/bazel-contrib/rules_nodejs/releases/download/v6.3.3/rules_nodejs-v6.3.3.tar.gz",  # Ensure the URL is correct
)

# Fetch rules_ts (Updated to a valid version)
http_archive(
    name = "rules_ts",
    sha256 = "sha256-checksum-here",  # Replace with the checksum of the version you're using
    strip_prefix = "rules_typescript-5.0.0",  # Adjust this based on the version you pick
    url = "https://github.com/bazelbuild/rules_typescript/releases/download/5.0.0/rules_typescript-5.0.0.tar.gz",  # Replace with the correct URL
)

# Register Node.js toolchains and install dependencies (rules_nodejs)
load("@rules_nodejs//nodejs:repositories.bzl", "nodejs_register_toolchains", "install_nodejs_deps")
nodejs_register_toolchains()
install_nodejs_deps()

# Register TypeScript dependencies (rules_ts)
load("@rules_ts//typescript:repositories.bzl", "rules_ts_dependencies")
rules_ts_dependencies()
