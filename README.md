# archipelago-configs
A collection of my [archipelago](https://archipelago.gg) configs.

## bundler
I also added a bundler to generate yamls for submitting multiple configs at once. [`bun`](https://bun.sh/) is required for running the bundler.

Config can be a json file, or js/ts with the config being the default export. There is a helper function for type-checking and bundle-autocompletion.

JS/TS config takes precedence over json.
