# WORKSPACE file

# Configure rules_nodejs
load("@rules_nodejs//nodejs:repositories.bzl", "nodejs_register_toolchains", "install_nodejs_deps")
nodejs_register_toolchains()
install_nodejs_deps()

# Configure rules_ts
load("@rules_ts//typescript:repositories.bzl", "rules_ts_dependencies")
rules_ts_dependencies()
