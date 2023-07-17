#!/bin/sh

export PORT=${PORT:-3001}
export PORT2=${PORT2:-3002}
envsubst < /etc/prometheus.yaml.template > /etc/prometheus.yaml
/prometheus/prometheus "$@"
