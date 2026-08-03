FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
COPY docker-entrypoint.sh /docker-entrypoint-reading-helper.sh

RUN chmod +x /docker-entrypoint-reading-helper.sh

ENV AUDIO_ENABLED=false
ENV AUDIO_RATE=0.85

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint-reading-helper.sh"]
