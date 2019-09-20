#!/usr/bin/env bash
function yellow(){
    echo -e "\033[33m\033[01m[ $* ]\033[0m"
}

(
yellow 开始部署环境，去喝杯茶吧！

setenforce 0 &&
yellow 临时关闭SELinux成功 &&

sed -i 's/SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config &&
yellow 永久关闭SELinux成功 &&

(
cat <<EOF
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 8.8.4.4
nameserver 114.114.114.114
EOF
) > /etc/resolv.conf &&
yellow 配置DNS成功 &&
