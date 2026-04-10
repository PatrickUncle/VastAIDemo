#!/bin/bash
set -e

INSTALL_DIR="/opt/vastbase-support"
SERVICE_NAME="vastbase-support"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo " Vastbase Support 部署脚本"
echo "========================================="

if [ ! -f "$(which node 2>/dev/null)" ]; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js (>= 14)"
    exit 1
fi

echo "[1/5] 停止已有服务..."
systemctl stop ${SERVICE_NAME} 2>/dev/null || true

echo "[2/5] 复制项目文件到 ${INSTALL_DIR}..."
mkdir -p ${INSTALL_DIR}
cp -r ${SCRIPT_DIR}/* ${INSTALL_DIR}/
cp -r ${SCRIPT_DIR}/.env ${INSTALL_DIR}/ 2>/dev/null || true

echo "[3/5] 安装 npm 依赖..."
cd ${INSTALL_DIR}
npm install --production

echo "[4/5] 安装 systemd 服务..."
cp ${INSTALL_DIR}/${SERVICE_NAME}.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}

echo "[5/5] 启动服务..."
systemctl start ${SERVICE_NAME}

sleep 2
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo ""
    echo "========================================="
    echo " 部署成功！"
    echo "========================================="
    echo ""
    echo " 服务状态: systemctl status ${SERVICE_NAME}"
    echo " 启动服务: systemctl start ${SERVICE_NAME}"
    echo " 停止服务: systemctl stop ${SERVICE_NAME}"
    echo " 重启服务: systemctl restart ${SERVICE_NAME}"
    echo " 查看日志: journalctl -u ${SERVICE_NAME} -f"
    echo ""
    source ${INSTALL_DIR}/.env
    echo " 访问地址: http://${LOCAL_IP}:${PORT}/"
    echo ""
else
    echo "[错误] 服务启动失败，请检查日志:"
    echo "  journalctl -u ${SERVICE_NAME} -n 50"
    exit 1
fi
