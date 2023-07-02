FROM ubuntu:latest

WORKDIR /

# Install Prometheus, envsubst, and other dependencies
RUN apt-get update && apt-get install -y wget gettext-base
RUN wget https://github.com/prometheus/prometheus/releases/download/v2.29.1/prometheus-2.29.1.linux-amd64.tar.gz
RUN tar xvf prometheus-2.29.1.linux-amd64.tar.gz
RUN mv prometheus-2.29.1.linux-amd64 prometheus

# Copy Prometheus config and script
COPY ./monitoring/prometheus.yaml.template /etc/prometheus.yaml.template
COPY ./monitoring/entrypoint.sh /entrypoint.sh

# Set executable permissions
RUN chmod +x /entrypoint.sh
RUN chmod +x /prometheus/prometheus

# Set the entrypoint script
ENTRYPOINT [ "/entrypoint.sh" ]
CMD [ "--config.file=/etc/prometheus.yaml" ]
