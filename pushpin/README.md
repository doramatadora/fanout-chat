# Local Development: Pushpin

Do you want to run a local instance of [Pushpin](https://pushpin.org/docs/)? This is for you!

## Setup

Make sure you're running Docker.

1. Pull the Pushpin image (tag: `1.35.0-1`) from Docker:
    ```sh
    npm run pull
    ```
1. Ensure that local ports `5560-5563` and `7999` are free. Then run the following command to start Pushpin:
    ```sh
    npm start
    ```
