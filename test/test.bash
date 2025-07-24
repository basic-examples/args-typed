#!/bin/bash

set -e

cd "$(dirname "$0")"

EXIT_CODE=0

# TMP_DIR=$(mktemp -d)
TMP_DIR=tmp

output_stdout="$TMP_DIR/stdout"
output_stderr="$TMP_DIR/stderr"

rm -rf "$TMP_DIR"
# trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR"

for input_file in data/*/*.in.txt; do
  dir=$(dirname "$input_file")
  test_file=$(basename "$dir")
  test_case=$(basename "$input_file" .in.txt)

  code_file="$dir/${test_case}.code.txt"
  stdout_file="$dir/${test_case}.stdout.txt"
  stderr_file="$dir/${test_case}.stderr.txt"

  args=()
  while IFS= read -r line; do
    args+=("$line")
  done < "$input_file"

  set +e
  npx tsx "src/${test_file}.ts" "${args[@]}" >"$output_stdout" 2>"$output_stderr"
  actual_code=$?
  set -e

  expected_code=$([[ -f "$code_file" ]] && cat "$code_file" || echo 0)
  if [ "$actual_code" != "$expected_code" ]; then
    echo "Exit code mismatch in $input_file: expected $expected_code, got $actual_code"
    EXIT_CODE=1
  fi

  cp "$output_stdout" "$stdout_file"

  if ! diff "$output_stdout" <([[ -f "$stdout_file" ]] && cat "$stdout_file" || printf ""); then
    echo "Stdout mismatch in $input_file"
    EXIT_CODE=1
  fi

  if ! diff "$output_stderr" <([[ -f "$stderr_file" ]] && cat "$stderr_file" || printf ""); then
    echo "Stderr mismatch in $input_file"
    EXIT_CODE=1
  fi
done

exit $EXIT_CODE
