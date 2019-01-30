FROM mongo:4.0.3-xenial

COPY assets/keyfile /
COPY assets/scripts/* /
COPY assets/modules/*.js /

ENTRYPOINT ["sh", "/start.sh"]
