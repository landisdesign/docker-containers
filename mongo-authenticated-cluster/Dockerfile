FROM mongo:4.0.3-xenial
COPY start.sh secrets.sh mongo-startup.js keyfile /
ENTRYPOINT ["sh", "/start.sh"]
