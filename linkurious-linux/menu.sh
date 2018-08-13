#!/bin/bash
# Copyright (c) 2015-2017 "Linkurious SAS"
# This file is part of Linkurious.

LK_DIR="$( cd "$( dirname "$0" )" && pwd )"

ADD_FORCE_USER=""
USER=""

# Avoid launching manager as root
if [[ "$EUID" == "0" ]]; then

    # First, see if --user was passed
    for i in "$@"
    do
        case ${i} in
            --user=*) USER="${i#*=}" ;;
        *) ;;
        esac
    done

    # Finally, try to rely on the owner of the Linkurious directory
    if [[ "$USER" == "" || "$USER" == "root" ]]; then
        USER=`ls -ld "${LK_DIR}" 2>/dev/null | awk '{print $3}' 2>/dev/null`
        ADD_FORCE_USER="--user=$USER"
    fi

fi

if ! [[ -x "${LK_DIR}/system/node" ]]; then
    chmod 755 ${LK_DIR}/system/node
fi

# export PATH=${LK_DIR}/system:${PATH}

pushd ./ &> /dev/null
cd "${LK_DIR}/system"
# run as $USER if ($USER is set) AND (sudo was not used)
if [[ "$USER" != "" && "$SUDO_USER" == "" ]];
    then su ${USER} -s /bin/sh -c "./node ./manager/manager.js $@ $ADD_FORCE_USER"
    else ./node ./manager/manager.js $@ ${ADD_FORCE_USER}
fi
popd &> /dev/null
