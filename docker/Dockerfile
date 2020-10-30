FROM node:12 as node_builder
WORKDIR /app
COPY package.json /app/
COPY package-lock.json /app/
RUN npm install
COPY ./ /app
ARG env=prod
RUN npm run build -- --prod

########################################################################################################################

FROM centos:7

ENV TZ=Europe/Helsinki
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Initialize system
RUN useradd -ms /bin/false -d /app node && \
    yum install -y epel-release && \
    yum install -y wget nano redis supervisor && \
    mkdir -p /app/data && \
    mkdir -p /var/log/supervisor && \
    mkdir -p /var/run/supervisor/ && \
    chown -R node:node /app && \
    chown -R node:node /var/log/supervisor && \
    chown node:node /etc/redis.conf && \
    chown -R node:node /var/lib/redis && \
    (curl -sL https://rpm.nodesource.com/setup_8.x | bash -) && \
    yum install -y nodejs && \
    npm install -g pm2@2.5.0 && \
    sed --in-place -r 's/^save /# save /g' /etc/redis.conf && \
    sed --in-place -r 's/^logfile [^\n]+/logfile ""/g' /etc/redis.conf

# Copy sources and other files
COPY --from=node_builder /app/dist/ /app/dist/
COPY ./views /app/views
COPY ./package.json /app
COPY ./package-lock.json /app
COPY ./.env.variables /app

RUN (cd /app && npm install --only=production) && \
    npm uninstall -g npm

COPY ./docker/supervisord.ini /etc/
COPY ./docker/process.yml /app/
COPY ./docker/justus.ini /etc/supervisord.d/
COPY ./docker/redis.ini /etc/supervisord.d/


EXPOSE 3000
WORKDIR /app
CMD [ "/usr/bin/supervisord", "--configuration", "/etc/supervisord.ini" ]
