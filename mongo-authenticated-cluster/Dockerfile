FROM landisdesign/mongo-authenticated:4.0.3-xenial

RUN mv build_mongo-admins.sh build_initial_mongo-admins.sh &&\
    mv post_startup.sh restore.sh

COPY assets/* /

ENTRYPOINT ["sh", "/start.sh"]