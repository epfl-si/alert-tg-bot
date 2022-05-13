# Use the official Node.js image as parent image
FROM node:lts-slim

# Set the working directory. If it doesn't exists, it'll be created
WORKDIR /app

ARG NODE_ENV="production"
ENV NODE_ENV="production"

# Expose the port 3000
EXPOSE 3000

# Copy the file `package.json` from current folder
# inside our image in the folder `/app`
COPY ./package.json /app/package.json

# Install the dependencies
RUN npm install

# Copy all files from current folder
# inside our image in the folder `/app`
COPY dist/*.js /app/src/

# Start the app
ENTRYPOINT ["node", "src/app.js"]
