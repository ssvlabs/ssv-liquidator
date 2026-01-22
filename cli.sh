#!/bin/sh

export NODE_OPTIONS=--openssl-legacy-provider

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if LIQUIDATOR_TYPE is set
if [ -z "$LIQUIDATOR_TYPE" ]; then
    echo "ERROR: LIQUIDATOR_TYPE environment variable is not set!"
    echo "Please set LIQUIDATOR_TYPE to either 'eth' or 'ssv' in your .env file"
    exit 1
fi

# Convert to lowercase for case-insensitive comparison
LIQUIDATOR_TYPE_LOWER=$(echo "$LIQUIDATOR_TYPE" | tr '[:upper:]' '[:lower:]')

if [ "$LIQUIDATOR_TYPE_LOWER" = "eth" ]; then
    LIQUIDATOR_PATH="src/services/worker/worker.tsx"
    echo "Running ETH liquidator..."
elif [ "$LIQUIDATOR_TYPE_LOWER" = "ssv" ]; then
    LIQUIDATOR_PATH="src_ssv/services/worker/worker.tsx"
    echo "Running SSV liquidator..."
else
    echo "ERROR: Invalid LIQUIDATOR_TYPE value: $LIQUIDATOR_TYPE"
    echo "LIQUIDATOR_TYPE must be either 'eth' or 'ssv' (case-insensitive)"
    exit 1
fi

# Run the worker with retry logic
i=1
RET=-1
while [ $RET -ne 0 ] && [ $RET -ne 2 ]; do
    [ $i -eq 1 ] || (sleep 5 && echo "Running Liquidator. Attempt #"$i)
    ./node_modules/.bin/ts-node -r tsconfig-paths/register $LIQUIDATOR_PATH $*
    RET=$?
    i=$((i+1))
done
exit $RET
