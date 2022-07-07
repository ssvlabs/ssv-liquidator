#!/bin/sh

i=1
RET=-1
while [ $i -le 5 ] && [ $RET -ne 0 ]; do
    [ $i -eq 1 ] || sleep 5
    ./node_modules/.bin/ts-node -r tsconfig-paths/register src/services/worker/worker.tsx
    RET=$?
    i=$((i+1))
    echo "Running Liquidator. Attempt #"$i
done
exit $RET
