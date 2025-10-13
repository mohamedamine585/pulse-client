FROM ubuntu:latest
LABEL authors="foxwe"

ENTRYPOINT ["top", "-b"]