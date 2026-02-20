FROM dpage/pgadmin4:latest

USER root

RUN apk add --no-cache aws-cli jq curl

RUN mkdir -p /var/lib/pgadmin/storage && \
    mkdir -p /pgadmin4 && \
    chown -R 5050:5050 /var/lib/pgadmin/ && \
    chown -R 5050:5050 /pgadmin4

COPY entrypoint.sh /entrypoint_discovery.sh
RUN chmod +x /entrypoint_discovery.sh

USER 5050

ENTRYPOINT ["/entrypoint_discovery.sh"]
