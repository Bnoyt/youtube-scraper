#!/bin/bash
# Copyright (c) 2015 "Linkurious SAS"
# This file is part of Linkurious.

LK_DIR="$( cd "$( dirname "$0" )" && pwd )"

function stop {
    "${LK_DIR}/stop.sh.command"
}

function update {
    pushd ./ &> /dev/null
    cd "${LK_DIR}"
    NODE_PATH="${LK_DIR}/system/node_modules" bash -c "./system/updater/node ./system/updater/updater.js"
    popd &> /dev/null

}

while true; do
    read -p "This will STOP and UPDATE Linkurious, are you sure? [yes|no]:" yn
    case ${yn} in
        [Yy]* ) stop; update; break;;
        * ) echo "Cancelled."; exit;;
    esac
done
