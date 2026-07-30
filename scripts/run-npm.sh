#!/bin/sh
# 本机 Node 安装在 ~/.local/node（非系统级），启动脚本需先加入 PATH
export PATH="$HOME/.local/node/node-v24.18.1-darwin-arm64/bin:$PATH"
exec npm "$@"
