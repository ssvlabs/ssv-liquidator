#!/bin/sh

export APP_PORT=${APP_PORT:-3000}
envsubst < /etc/prometheus.yaml.template > /etc/prometheus.yaml
/prometheus/prometheus "$@"
