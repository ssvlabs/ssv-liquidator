#!/bin/sh

i=1
RET=-1
while [ $RET -ne 0 ] && [ $RET -ne 2 ]; do
    [ $i -eq 1 ] || (sleep 5 && echo "Running Liquidator. Attempt #"$i)
    ./node_modules/.bin/ts-node -r tsconfig-paths/register src/services/worker/worker.tsx $*
    RET=$?
    i=$((i+1))
done
exit $RET
