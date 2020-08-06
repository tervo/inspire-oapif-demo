#FROM centos:7
FROM node:8

# Create app directory
WORKDIR /usr/src/app

# Install NodeJS 8
# (procedure adapted from https://nodejs.org/en/download/package-manager/)
#RUN curl --silent --location https://rpm.nodesource.com/setup_8.x | bash -
#RUN yum -y install nodejs

# Setup user
RUN useradd -r -u 999 -g users sofp-user -d /usr/src/app
RUN chgrp users /usr/src/app
RUN chmod g+rx /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install
# We could add --only=production, but we want to run tests

# Copy application, build & test
COPY . .
RUN npm run build
RUN npm run test

# Build library
WORKDIR /usr/src/app/sofp-lib
RUN npm install
RUN npm run build
RUN rm -rf ../node_modules/sofp-lib
#RUN npm install ../node_modules/sofp-lib
RUN cd .. && npm link sofp-lib

WORKDIR /usr/src/app/backends/smartmet-sofp-backend-inspire-oapif-demo-aws-obs
RUN npm install
RUN npm run build

WORKDIR /usr/src/app

USER sofp-user

# Done!
EXPOSE 3000
CMD [ "node", "dist/server/app.js", "-c", "/", "-t", "FMI OpenData INSPIRE OGC API Features DEMO", "-d", "INSPIRE compliant FMI OpenData OGC API Features demo server to provide automated weather observations (AWS)"]
