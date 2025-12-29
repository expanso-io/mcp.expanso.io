/**
 * Bloblang Reference Registry
 *
 * Complete reference for Bloblang functions and methods.
 * Used by the get_bloblang_reference MCP tool for accurate code generation.
 */

// ============================================================================
// Types
// ============================================================================

export interface BloblangParameter {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
  default?: string;
}

export interface BloblangItem {
  name: string;
  type: 'function' | 'method';
  category: BloblangCategory;
  signature: string;
  description: string;
  parameters?: BloblangParameter[];
  returns: string;
  example: string;
}

export type BloblangCategory =
  | 'general'
  | 'environment'
  | 'message'
  | 'fake'
  | 'string'
  | 'array'
  | 'object'
  | 'number'
  | 'timestamp'
  | 'encoding'
  | 'parsing'
  | 'type'
  | 'regex'
  | 'comparison';

// ============================================================================
// Functions Reference (~30 functions)
// ============================================================================

const BLOBLANG_FUNCTIONS: BloblangItem[] = [
  // General Functions
  {
    name: 'deleted',
    type: 'function',
    category: 'general',
    signature: 'deleted() -> deleted',
    description: 'Returns a deleted value that removes the field/message when assigned to root',
    returns: 'deleted',
    example: 'root = if this.skip { deleted() } else { this }',
  },
  {
    name: 'throw',
    type: 'function',
    category: 'general',
    signature: 'throw(reason: string) -> error',
    description: 'Throws an error with the given reason, causing message processing to fail',
    parameters: [{ name: 'reason', type: 'string', optional: false }],
    returns: 'error',
    example: 'root = if this.age < 0 { throw("age cannot be negative") } else { this }',
  },
  {
    name: 'range',
    type: 'function',
    category: 'general',
    signature: 'range(start: int, stop: int, step?: int) -> array',
    description: 'Creates an array of integers from start to stop (exclusive)',
    parameters: [
      { name: 'start', type: 'int', optional: false },
      { name: 'stop', type: 'int', optional: false },
      { name: 'step', type: 'int', optional: true, default: '1' },
    ],
    returns: 'array<int>',
    example: 'root.nums = range(0, 5)  # [0, 1, 2, 3, 4]',
  },
  {
    name: 'counter',
    type: 'function',
    category: 'general',
    signature: 'counter() -> int',
    description: 'Returns an incrementing counter starting from 1',
    returns: 'int',
    example: 'root.id = counter()  # 1, 2, 3, ...',
  },
  {
    name: 'uuid_v4',
    type: 'function',
    category: 'general',
    signature: 'uuid_v4() -> string',
    description: 'Generates a random UUID v4 string',
    returns: 'string',
    example: 'root.id = uuid_v4()  # "f47ac10b-58cc-4372-a567-0e02b2c3d479"',
  },
  {
    name: 'ksuid',
    type: 'function',
    category: 'general',
    signature: 'ksuid() -> string',
    description: 'Generates a K-Sortable Unique Identifier',
    returns: 'string',
    example: 'root.id = ksuid()',
  },
  {
    name: 'nanoid',
    type: 'function',
    category: 'general',
    signature: 'nanoid(size?: int) -> string',
    description: 'Generates a compact, URL-friendly unique ID',
    parameters: [{ name: 'size', type: 'int', optional: true, default: '21' }],
    returns: 'string',
    example: 'root.id = nanoid()  # "V1StGXR8_Z5jdHi6B-myT"',
  },
  {
    name: 'ulid',
    type: 'function',
    category: 'general',
    signature: 'ulid() -> string',
    description: 'Generates a Universally Unique Lexicographically Sortable Identifier',
    returns: 'string',
    example: 'root.id = ulid()',
  },
  {
    name: 'random_int',
    type: 'function',
    category: 'general',
    signature: 'random_int(min?: int, max?: int) -> int',
    description: 'Generates a random integer between min and max (inclusive)',
    parameters: [
      { name: 'min', type: 'int', optional: true, default: '0' },
      { name: 'max', type: 'int', optional: true, default: 'max_int' },
    ],
    returns: 'int',
    example: 'root.dice = random_int(1, 6)',
  },

  // Environment Functions
  {
    name: 'env',
    type: 'function',
    category: 'environment',
    signature: 'env(name: string) -> string',
    description: 'Returns the value of an environment variable',
    parameters: [{ name: 'name', type: 'string', optional: false }],
    returns: 'string',
    example: 'root.api_key = env("API_KEY")',
  },
  {
    name: 'file',
    type: 'function',
    category: 'environment',
    signature: 'file(path: string) -> string',
    description: 'Reads the contents of a file at the given path',
    parameters: [{ name: 'path', type: 'string', optional: false }],
    returns: 'string',
    example: 'root.cert = file("/etc/ssl/cert.pem")',
  },
  {
    name: 'hostname',
    type: 'function',
    category: 'environment',
    signature: 'hostname() -> string',
    description: 'Returns the hostname of the machine',
    returns: 'string',
    example: 'root.host = hostname()',
  },
  {
    name: 'now',
    type: 'function',
    category: 'environment',
    signature: 'now() -> timestamp',
    description: 'Returns the current timestamp',
    returns: 'timestamp',
    example: 'root.created_at = now()',
  },
  {
    name: 'timestamp_unix',
    type: 'function',
    category: 'environment',
    signature: 'timestamp_unix() -> int',
    description: 'Returns the current Unix timestamp in seconds',
    returns: 'int',
    example: 'root.ts = timestamp_unix()',
  },
  {
    name: 'timestamp_unix_milli',
    type: 'function',
    category: 'environment',
    signature: 'timestamp_unix_milli() -> int',
    description: 'Returns the current Unix timestamp in milliseconds',
    returns: 'int',
    example: 'root.ts_ms = timestamp_unix_milli()',
  },
  {
    name: 'timestamp_unix_micro',
    type: 'function',
    category: 'environment',
    signature: 'timestamp_unix_micro() -> int',
    description: 'Returns the current Unix timestamp in microseconds',
    returns: 'int',
    example: 'root.ts_us = timestamp_unix_micro()',
  },
  {
    name: 'timestamp_unix_nano',
    type: 'function',
    category: 'environment',
    signature: 'timestamp_unix_nano() -> int',
    description: 'Returns the current Unix timestamp in nanoseconds',
    returns: 'int',
    example: 'root.ts_ns = timestamp_unix_nano()',
  },

  // Message Functions
  {
    name: 'content',
    type: 'function',
    category: 'message',
    signature: 'content() -> bytes',
    description: 'Returns the raw message content as bytes',
    returns: 'bytes',
    example: 'root.raw = content()',
  },
  {
    name: 'json',
    type: 'function',
    category: 'message',
    signature: 'json(path?: string) -> any',
    description: 'Returns parsed JSON from message, optionally at a specific path',
    parameters: [{ name: 'path', type: 'string', optional: true }],
    returns: 'any',
    example: 'root.name = json("user.name")',
  },
  {
    name: 'metadata',
    type: 'function',
    category: 'message',
    signature: 'metadata(key?: string) -> any',
    description: 'Returns message metadata, optionally a specific key',
    parameters: [{ name: 'key', type: 'string', optional: true }],
    returns: 'any',
    example: 'root.topic = metadata("kafka_topic")',
  },
  {
    name: 'error',
    type: 'function',
    category: 'message',
    signature: 'error() -> string',
    description: 'Returns the error message if the message is flagged as failed',
    returns: 'string',
    example: 'root.error_msg = error()',
  },
  {
    name: 'errored',
    type: 'function',
    category: 'message',
    signature: 'errored() -> bool',
    description: 'Returns true if the message has been flagged as failed',
    returns: 'bool',
    example: 'root = if errored() { deleted() } else { this }',
  },
  {
    name: 'batch_index',
    type: 'function',
    category: 'message',
    signature: 'batch_index() -> int',
    description: 'Returns the index of the current message in the batch',
    returns: 'int',
    example: 'root.idx = batch_index()',
  },
  {
    name: 'batch_size',
    type: 'function',
    category: 'message',
    signature: 'batch_size() -> int',
    description: 'Returns the total number of messages in the batch',
    returns: 'int',
    example: 'root.total = batch_size()',
  },

  // Fake Data Functions
  {
    name: 'fake',
    type: 'function',
    category: 'fake',
    signature: 'fake(type: string) -> string',
    description: 'Generates fake data of the specified type for testing',
    parameters: [
      {
        name: 'type',
        type: 'string',
        optional: false,
        description:
          'One of: name, first_name, last_name, email, phone, address, city, country, company, job_title, paragraph, sentence, word, url, ipv4, ipv6, uuid, username, password, credit_card, date, time, timezone, latitude, longitude',
      },
    ],
    returns: 'string',
    example: 'root.email = fake("email")  # "john.doe@example.com"',
  },
];

// ============================================================================
// Methods Reference (~100 methods)
// ============================================================================

const BLOBLANG_METHODS: BloblangItem[] = [
  // String Methods
  {
    name: 'capitalize',
    type: 'method',
    category: 'string',
    signature: '.capitalize() -> string',
    description: 'Capitalizes the first character of the string',
    returns: 'string',
    example: '"hello".capitalize()  # "Hello"',
  },
  {
    name: 'lowercase',
    type: 'method',
    category: 'string',
    signature: '.lowercase() -> string',
    description: 'Converts all characters to lowercase',
    returns: 'string',
    example: 'this.name.lowercase()',
  },
  {
    name: 'uppercase',
    type: 'method',
    category: 'string',
    signature: '.uppercase() -> string',
    description: 'Converts all characters to uppercase',
    returns: 'string',
    example: 'this.code.uppercase()',
  },
  {
    name: 'trim',
    type: 'method',
    category: 'string',
    signature: '.trim(cutset?: string) -> string',
    description: 'Removes leading and trailing whitespace (or specified characters)',
    parameters: [{ name: 'cutset', type: 'string', optional: true }],
    returns: 'string',
    example: '"  hello  ".trim()  # "hello"',
  },
  {
    name: 'trim_prefix',
    type: 'method',
    category: 'string',
    signature: '.trim_prefix(prefix: string) -> string',
    description: 'Removes a prefix from the string if present',
    parameters: [{ name: 'prefix', type: 'string', optional: false }],
    returns: 'string',
    example: '"hello_world".trim_prefix("hello_")  # "world"',
  },
  {
    name: 'trim_suffix',
    type: 'method',
    category: 'string',
    signature: '.trim_suffix(suffix: string) -> string',
    description: 'Removes a suffix from the string if present',
    parameters: [{ name: 'suffix', type: 'string', optional: false }],
    returns: 'string',
    example: '"file.txt".trim_suffix(".txt")  # "file"',
  },
  {
    name: 'split',
    type: 'method',
    category: 'string',
    signature: '.split(delimiter: string) -> array',
    description: 'Splits the string by delimiter into an array',
    parameters: [{ name: 'delimiter', type: 'string', optional: false }],
    returns: 'array<string>',
    example: '"a,b,c".split(",")  # ["a", "b", "c"]',
  },
  {
    name: 'replace_all',
    type: 'method',
    category: 'string',
    signature: '.replace_all(old: string, new: string) -> string',
    description: 'Replaces all occurrences of old with new',
    parameters: [
      { name: 'old', type: 'string', optional: false },
      { name: 'new', type: 'string', optional: false },
    ],
    returns: 'string',
    example: '"hello world".replace_all("o", "0")  # "hell0 w0rld"',
  },
  {
    name: 'replace_all_many',
    type: 'method',
    category: 'string',
    signature: '.replace_all_many(pairs: array) -> string',
    description: 'Replaces multiple pairs of old->new values',
    parameters: [{ name: 'pairs', type: 'array', optional: false }],
    returns: 'string',
    example: '"hello".replace_all_many(["h", "H", "e", "E"])  # "HEllo"',
  },
  {
    name: 'contains',
    type: 'method',
    category: 'string',
    signature: '.contains(substr: string) -> bool',
    description: 'Returns true if string contains the substring',
    parameters: [{ name: 'substr', type: 'string', optional: false }],
    returns: 'bool',
    example: '"hello world".contains("world")  # true',
  },
  {
    name: 'has_prefix',
    type: 'method',
    category: 'string',
    signature: '.has_prefix(prefix: string) -> bool',
    description: 'Returns true if string starts with prefix',
    parameters: [{ name: 'prefix', type: 'string', optional: false }],
    returns: 'bool',
    example: '"hello".has_prefix("he")  # true',
  },
  {
    name: 'has_suffix',
    type: 'method',
    category: 'string',
    signature: '.has_suffix(suffix: string) -> bool',
    description: 'Returns true if string ends with suffix',
    parameters: [{ name: 'suffix', type: 'string', optional: false }],
    returns: 'bool',
    example: '"hello.txt".has_suffix(".txt")  # true',
  },
  {
    name: 'index_of',
    type: 'method',
    category: 'string',
    signature: '.index_of(substr: string) -> int',
    description: 'Returns the index of first occurrence of substr, or -1',
    parameters: [{ name: 'substr', type: 'string', optional: false }],
    returns: 'int',
    example: '"hello".index_of("l")  # 2',
  },
  {
    name: 'length',
    type: 'method',
    category: 'string',
    signature: '.length() -> int',
    description: 'Returns the length of string/array',
    returns: 'int',
    example: '"hello".length()  # 5',
  },
  {
    name: 'slice',
    type: 'method',
    category: 'string',
    signature: '.slice(start: int, end?: int) -> string',
    description: 'Returns substring from start to end (exclusive)',
    parameters: [
      { name: 'start', type: 'int', optional: false },
      { name: 'end', type: 'int', optional: true },
    ],
    returns: 'string',
    example: '"hello".slice(1, 4)  # "ell"',
  },
  {
    name: 'escape_html',
    type: 'method',
    category: 'string',
    signature: '.escape_html() -> string',
    description: 'Escapes HTML special characters',
    returns: 'string',
    example: '"<div>".escape_html()  # "&lt;div&gt;"',
  },
  {
    name: 'escape_url_query',
    type: 'method',
    category: 'string',
    signature: '.escape_url_query() -> string',
    description: 'URL-encodes the string for query parameters',
    returns: 'string',
    example: '"hello world".escape_url_query()  # "hello%20world"',
  },
  {
    name: 'unescape_url_query',
    type: 'method',
    category: 'string',
    signature: '.unescape_url_query() -> string',
    description: 'URL-decodes the string',
    returns: 'string',
    example: '"hello%20world".unescape_url_query()  # "hello world"',
  },
  {
    name: 'format',
    type: 'method',
    category: 'string',
    signature: '.format(...args: any) -> string',
    description: 'Formats string with %s, %d, %v placeholders',
    parameters: [{ name: 'args', type: 'any', optional: false }],
    returns: 'string',
    example: '"%s is %d".format("count", 42)  # "count is 42"',
  },
  {
    name: 'quote',
    type: 'method',
    category: 'string',
    signature: '.quote() -> string',
    description: 'Adds quotes around the string',
    returns: 'string',
    example: '"hello".quote()  # "\\"hello\\""',
  },
  {
    name: 'unquote',
    type: 'method',
    category: 'string',
    signature: '.unquote() -> string',
    description: 'Removes surrounding quotes from string',
    returns: 'string',
    example: '"\\"hello\\"".unquote()  # "hello"',
  },
  {
    name: 'reverse',
    type: 'method',
    category: 'string',
    signature: '.reverse() -> string',
    description: 'Reverses the string',
    returns: 'string',
    example: '"hello".reverse()  # "olleh"',
  },

  // Array Methods
  {
    name: 'map_each',
    type: 'method',
    category: 'array',
    signature: '.map_each(fn: lambda) -> array',
    description: 'Transforms each element using the lambda function',
    parameters: [{ name: 'fn', type: 'lambda', optional: false, description: 'x -> expression' }],
    returns: 'array',
    example: '[1, 2, 3].map_each(x -> x * 2)  # [2, 4, 6]',
  },
  {
    name: 'map_each_key',
    type: 'method',
    category: 'object',
    signature: '.map_each_key(fn: lambda) -> object',
    description: 'Transforms each key in an object using the lambda',
    parameters: [{ name: 'fn', type: 'lambda', optional: false }],
    returns: 'object',
    example: '{"a": 1}.map_each_key(k -> k.uppercase())  # {"A": 1}',
  },
  {
    name: 'filter',
    type: 'method',
    category: 'array',
    signature: '.filter(fn: lambda) -> array',
    description: 'Returns elements where lambda returns true',
    parameters: [{ name: 'fn', type: 'lambda', optional: false, description: 'x -> bool' }],
    returns: 'array',
    example: '[1, 2, 3, 4].filter(x -> x > 2)  # [3, 4]',
  },
  {
    name: 'fold',
    type: 'method',
    category: 'array',
    signature: '.fold(initial: any, fn: lambda) -> any',
    description: 'Reduces array to single value using accumulator',
    parameters: [
      { name: 'initial', type: 'any', optional: false },
      { name: 'fn', type: 'lambda', optional: false, description: '(acc, x) -> new_acc' },
    ],
    returns: 'any',
    example: '[1, 2, 3].fold(0, (acc, x) -> acc + x)  # 6',
  },
  {
    name: 'flatten',
    type: 'method',
    category: 'array',
    signature: '.flatten() -> array',
    description: 'Flattens nested arrays by one level',
    returns: 'array',
    example: '[[1, 2], [3, 4]].flatten()  # [1, 2, 3, 4]',
  },
  {
    name: 'sort',
    type: 'method',
    category: 'array',
    signature: '.sort(descending?: bool) -> array',
    description: 'Sorts array elements',
    parameters: [{ name: 'descending', type: 'bool', optional: true, default: 'false' }],
    returns: 'array',
    example: '[3, 1, 2].sort()  # [1, 2, 3]',
  },
  {
    name: 'sort_by',
    type: 'method',
    category: 'array',
    signature: '.sort_by(fn: lambda) -> array',
    description: 'Sorts array by value returned from lambda',
    parameters: [{ name: 'fn', type: 'lambda', optional: false }],
    returns: 'array',
    example: '[{"n": 3}, {"n": 1}].sort_by(x -> x.n)  # [{"n": 1}, {"n": 3}]',
  },
  {
    name: 'unique',
    type: 'method',
    category: 'array',
    signature: '.unique() -> array',
    description: 'Returns array with duplicate elements removed',
    returns: 'array',
    example: '[1, 2, 2, 3].unique()  # [1, 2, 3]',
  },
  {
    name: 'append',
    type: 'method',
    category: 'array',
    signature: '.append(...items: any) -> array',
    description: 'Adds items to end of array',
    parameters: [{ name: 'items', type: 'any', optional: false }],
    returns: 'array',
    example: '[1, 2].append(3, 4)  # [1, 2, 3, 4]',
  },
  {
    name: 'concat',
    type: 'method',
    category: 'array',
    signature: '.concat(other: array) -> array',
    description: 'Concatenates two arrays',
    parameters: [{ name: 'other', type: 'array', optional: false }],
    returns: 'array',
    example: '[1, 2].concat([3, 4])  # [1, 2, 3, 4]',
  },
  {
    name: 'all',
    type: 'method',
    category: 'array',
    signature: '.all(fn: lambda) -> bool',
    description: 'Returns true if lambda is true for all elements',
    parameters: [{ name: 'fn', type: 'lambda', optional: false }],
    returns: 'bool',
    example: '[2, 4, 6].all(x -> x % 2 == 0)  # true',
  },
  {
    name: 'any',
    type: 'method',
    category: 'array',
    signature: '.any(fn: lambda) -> bool',
    description: 'Returns true if lambda is true for any element',
    parameters: [{ name: 'fn', type: 'lambda', optional: false }],
    returns: 'bool',
    example: '[1, 2, 3].any(x -> x > 2)  # true',
  },
  {
    name: 'sum',
    type: 'method',
    category: 'array',
    signature: '.sum() -> number',
    description: 'Returns sum of numeric array elements',
    returns: 'number',
    example: '[1, 2, 3].sum()  # 6',
  },
  {
    name: 'min',
    type: 'method',
    category: 'number',
    signature: '.min() -> number',
    description: 'Returns minimum value in array',
    returns: 'number',
    example: '[3, 1, 2].min()  # 1',
  },
  {
    name: 'max',
    type: 'method',
    category: 'number',
    signature: '.max() -> number',
    description: 'Returns maximum value in array',
    returns: 'number',
    example: '[3, 1, 2].max()  # 3',
  },
  {
    name: 'join',
    type: 'method',
    category: 'array',
    signature: '.join(separator: string) -> string',
    description: 'Joins array elements into string with separator',
    parameters: [{ name: 'separator', type: 'string', optional: false }],
    returns: 'string',
    example: '["a", "b", "c"].join(",")  # "a,b,c"',
  },
  {
    name: 'index',
    type: 'method',
    category: 'array',
    signature: '.index(idx: int) -> any',
    description: 'Returns element at index (negative counts from end)',
    parameters: [{ name: 'idx', type: 'int', optional: false }],
    returns: 'any',
    example: '["a", "b", "c"].index(1)  # "b"',
  },
  {
    name: 'first',
    type: 'method',
    category: 'array',
    signature: '.first() -> any',
    description: 'Returns the first element of array',
    returns: 'any',
    example: '[1, 2, 3].first()  # 1',
  },
  {
    name: 'last',
    type: 'method',
    category: 'array',
    signature: '.last() -> any',
    description: 'Returns the last element of array',
    returns: 'any',
    example: '[1, 2, 3].last()  # 3',
  },
  {
    name: 'enumerated',
    type: 'method',
    category: 'array',
    signature: '.enumerated() -> array',
    description: 'Returns array of [index, value] pairs',
    returns: 'array',
    example: '["a", "b"].enumerated()  # [[0, "a"], [1, "b"]]',
  },
  {
    name: 'zip',
    type: 'method',
    category: 'array',
    signature: '.zip(other: array) -> array',
    description: 'Zips two arrays into array of pairs',
    parameters: [{ name: 'other', type: 'array', optional: false }],
    returns: 'array',
    example: '[1, 2].zip(["a", "b"])  # [[1, "a"], [2, "b"]]',
  },

  // Object Methods
  {
    name: 'keys',
    type: 'method',
    category: 'object',
    signature: '.keys() -> array',
    description: 'Returns array of object keys',
    returns: 'array<string>',
    example: '{"a": 1, "b": 2}.keys()  # ["a", "b"]',
  },
  {
    name: 'values',
    type: 'method',
    category: 'object',
    signature: '.values() -> array',
    description: 'Returns array of object values',
    returns: 'array',
    example: '{"a": 1, "b": 2}.values()  # [1, 2]',
  },
  {
    name: 'get',
    type: 'method',
    category: 'object',
    signature: '.get(path: string) -> any',
    description: 'Gets value at dot-separated path',
    parameters: [{ name: 'path', type: 'string', optional: false }],
    returns: 'any',
    example: '{"a": {"b": 1}}.get("a.b")  # 1',
  },
  {
    name: 'merge',
    type: 'method',
    category: 'object',
    signature: '.merge(other: object) -> object',
    description: 'Merges objects, other values override',
    parameters: [{ name: 'other', type: 'object', optional: false }],
    returns: 'object',
    example: '{"a": 1}.merge({"b": 2})  # {"a": 1, "b": 2}',
  },
  {
    name: 'assign',
    type: 'method',
    category: 'object',
    signature: '.assign(key: string, value: any) -> object',
    description: 'Returns new object with key set to value',
    parameters: [
      { name: 'key', type: 'string', optional: false },
      { name: 'value', type: 'any', optional: false },
    ],
    returns: 'object',
    example: '{"a": 1}.assign("b", 2)  # {"a": 1, "b": 2}',
  },
  {
    name: 'with',
    type: 'method',
    category: 'object',
    signature: '.with(...keys: string) -> object',
    description: 'Returns object with only specified keys',
    parameters: [{ name: 'keys', type: 'string', optional: false }],
    returns: 'object',
    example: '{"a": 1, "b": 2, "c": 3}.with("a", "b")  # {"a": 1, "b": 2}',
  },
  {
    name: 'without',
    type: 'method',
    category: 'object',
    signature: '.without(...keys: string) -> object',
    description: 'Returns object without specified keys',
    parameters: [{ name: 'keys', type: 'string', optional: false }],
    returns: 'object',
    example: '{"a": 1, "b": 2, "c": 3}.without("c")  # {"a": 1, "b": 2}',
  },
  {
    name: 'exists',
    type: 'method',
    category: 'object',
    signature: '.exists(path: string) -> bool',
    description: 'Returns true if path exists in object',
    parameters: [{ name: 'path', type: 'string', optional: false }],
    returns: 'bool',
    example: '{"a": {"b": 1}}.exists("a.b")  # true',
  },
  {
    name: 'collapse',
    type: 'method',
    category: 'object',
    signature: '.collapse() -> object',
    description: 'Flattens nested object into dot-notation keys',
    returns: 'object',
    example: '{"a": {"b": 1}}.collapse()  # {"a.b": 1}',
  },
  {
    name: 'explode',
    type: 'method',
    category: 'object',
    signature: '.explode() -> object',
    description: 'Expands dot-notation keys into nested object',
    returns: 'object',
    example: '{"a.b": 1}.explode()  # {"a": {"b": 1}}',
  },
  {
    name: 'key_values',
    type: 'method',
    category: 'object',
    signature: '.key_values() -> array',
    description: 'Returns array of {"key": k, "value": v} objects',
    returns: 'array',
    example: '{"a": 1}.key_values()  # [{"key": "a", "value": 1}]',
  },

  // Parsing Methods
  {
    name: 'parse_json',
    type: 'method',
    category: 'parsing',
    signature: '.parse_json() -> any',
    description: 'Parses JSON string into object/array',
    returns: 'any',
    example: '\'{"a": 1}\'.parse_json()  # {"a": 1}',
  },
  {
    name: 'format_json',
    type: 'method',
    category: 'parsing',
    signature: '.format_json(indent?: bool) -> string',
    description: 'Serializes value to JSON string',
    parameters: [{ name: 'indent', type: 'bool', optional: true, default: 'false' }],
    returns: 'string',
    example: '{"a": 1}.format_json()  # \'{"a":1}\'',
  },
  {
    name: 'parse_yaml',
    type: 'method',
    category: 'parsing',
    signature: '.parse_yaml() -> any',
    description: 'Parses YAML string into object/array',
    returns: 'any',
    example: '"a: 1".parse_yaml()  # {"a": 1}',
  },
  {
    name: 'format_yaml',
    type: 'method',
    category: 'parsing',
    signature: '.format_yaml() -> string',
    description: 'Serializes value to YAML string',
    returns: 'string',
    example: '{"a": 1}.format_yaml()  # "a: 1\\n"',
  },
  {
    name: 'parse_xml',
    type: 'method',
    category: 'parsing',
    signature: '.parse_xml() -> object',
    description: 'Parses XML string into object',
    returns: 'object',
    example: '"<a>1</a>".parse_xml()  # {"a": "1"}',
  },
  {
    name: 'format_xml',
    type: 'method',
    category: 'parsing',
    signature: '.format_xml() -> string',
    description: 'Serializes object to XML string',
    returns: 'string',
    example: '{"a": 1}.format_xml()',
  },
  {
    name: 'parse_csv',
    type: 'method',
    category: 'parsing',
    signature: '.parse_csv() -> array',
    description: 'Parses CSV string into array of objects',
    returns: 'array',
    example: '"a,b\\n1,2".parse_csv()  # [{"a": "1", "b": "2"}]',
  },
  {
    name: 'parse_url',
    type: 'method',
    category: 'parsing',
    signature: '.parse_url() -> object',
    description: 'Parses URL into components (scheme, host, path, etc.)',
    returns: 'object',
    example: '"http://example.com/path?q=1".parse_url()  # {"scheme": "http", ...}',
  },
  {
    name: 'parse_form_url_encoded',
    type: 'method',
    category: 'parsing',
    signature: '.parse_form_url_encoded() -> object',
    description: 'Parses URL-encoded form data into object',
    returns: 'object',
    example: '"a=1&b=2".parse_form_url_encoded()  # {"a": "1", "b": "2"}',
  },

  // Type Methods
  {
    name: 'string',
    type: 'method',
    category: 'type',
    signature: '.string() -> string',
    description: 'Converts value to string',
    returns: 'string',
    example: '123.string()  # "123"',
  },
  {
    name: 'number',
    type: 'method',
    category: 'type',
    signature: '.number() -> number',
    description: 'Converts value to number',
    returns: 'number',
    example: '"123".number()  # 123',
  },
  {
    name: 'bool',
    type: 'method',
    category: 'type',
    signature: '.bool() -> bool',
    description: 'Converts value to boolean',
    returns: 'bool',
    example: '"true".bool()  # true',
  },
  {
    name: 'bytes',
    type: 'method',
    category: 'type',
    signature: '.bytes() -> bytes',
    description: 'Converts string to bytes',
    returns: 'bytes',
    example: '"hello".bytes()',
  },
  {
    name: 'type',
    type: 'method',
    category: 'type',
    signature: '.type() -> string',
    description: 'Returns the type name of value',
    returns: 'string',
    example: '{"a": 1}.type()  # "object"',
  },
  {
    name: 'not_null',
    type: 'method',
    category: 'type',
    signature: '.not_null() -> any',
    description: 'Returns value or throws if null',
    returns: 'any',
    example: 'this.value.not_null()',
  },
  {
    name: 'not_empty',
    type: 'method',
    category: 'type',
    signature: '.not_empty() -> any',
    description: 'Returns value or throws if empty string/array',
    returns: 'any',
    example: 'this.name.not_empty()',
  },
  {
    name: 'or',
    type: 'method',
    category: 'type',
    signature: '.or(default: any) -> any',
    description: 'Returns value or default if null/error',
    parameters: [{ name: 'default', type: 'any', optional: false }],
    returns: 'any',
    example: 'this.optional_field.or("default")',
  },
  {
    name: 'catch',
    type: 'method',
    category: 'type',
    signature: '.catch(fallback: any) -> any',
    description: 'Returns value or fallback on any error',
    parameters: [{ name: 'fallback', type: 'any', optional: false }],
    returns: 'any',
    example: 'this.data.parse_json().catch({})',
  },

  // Timestamp Methods
  {
    name: 'ts_format',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_format(layout: string, tz?: string) -> string',
    description: 'Formats timestamp using Go layout string',
    parameters: [
      { name: 'layout', type: 'string', optional: false, description: 'Go time layout or preset' },
      { name: 'tz', type: 'string', optional: true },
    ],
    returns: 'string',
    example: 'now().ts_format("2006-01-02T15:04:05Z07:00")',
  },
  {
    name: 'ts_parse',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_parse(layout: string) -> timestamp',
    description: 'Parses string to timestamp using Go layout',
    parameters: [{ name: 'layout', type: 'string', optional: false }],
    returns: 'timestamp',
    example: '"2024-01-15".ts_parse("2006-01-02")',
  },
  {
    name: 'ts_strftime',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_strftime(format: string) -> string',
    description: 'Formats timestamp using strftime format',
    parameters: [{ name: 'format', type: 'string', optional: false }],
    returns: 'string',
    example: 'now().ts_strftime("%Y-%m-%d")  # "2024-01-15"',
  },
  {
    name: 'ts_strptime',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_strptime(format: string) -> timestamp',
    description: 'Parses string to timestamp using strftime format',
    parameters: [{ name: 'format', type: 'string', optional: false }],
    returns: 'timestamp',
    example: '"2024-01-15".ts_strptime("%Y-%m-%d")',
  },
  {
    name: 'ts_unix',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_unix() -> int',
    description: 'Returns Unix timestamp in seconds',
    returns: 'int',
    example: 'now().ts_unix()',
  },
  {
    name: 'ts_unix_milli',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_unix_milli() -> int',
    description: 'Returns Unix timestamp in milliseconds',
    returns: 'int',
    example: 'now().ts_unix_milli()',
  },
  {
    name: 'ts_tz',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_tz(tz: string) -> timestamp',
    description: 'Converts timestamp to specified timezone',
    parameters: [{ name: 'tz', type: 'string', optional: false }],
    returns: 'timestamp',
    example: 'now().ts_tz("America/New_York")',
  },
  {
    name: 'ts_add_iso8601',
    type: 'method',
    category: 'timestamp',
    signature: '.ts_add_iso8601(duration: string) -> timestamp',
    description: 'Adds ISO 8601 duration to timestamp',
    parameters: [{ name: 'duration', type: 'string', optional: false }],
    returns: 'timestamp',
    example: 'now().ts_add_iso8601("P1D")  # adds 1 day',
  },
  {
    name: 'parse_duration',
    type: 'method',
    category: 'timestamp',
    signature: '.parse_duration() -> int',
    description: 'Parses Go duration string to nanoseconds',
    returns: 'int',
    example: '"1h30m".parse_duration()  # 5400000000000',
  },

  // Encoding Methods
  {
    name: 'encode',
    type: 'method',
    category: 'encoding',
    signature: '.encode(scheme: string) -> string',
    description: 'Encodes bytes using specified scheme',
    parameters: [
      { name: 'scheme', type: 'string', optional: false, description: 'base64, base64url, hex, ascii85, z85' },
    ],
    returns: 'string',
    example: '"hello".bytes().encode("base64")  # "aGVsbG8="',
  },
  {
    name: 'decode',
    type: 'method',
    category: 'encoding',
    signature: '.decode(scheme: string) -> bytes',
    description: 'Decodes string using specified scheme',
    parameters: [{ name: 'scheme', type: 'string', optional: false }],
    returns: 'bytes',
    example: '"aGVsbG8=".decode("base64")  # bytes("hello")',
  },
  {
    name: 'compress',
    type: 'method',
    category: 'encoding',
    signature: '.compress(algorithm: string) -> bytes',
    description: 'Compresses bytes using specified algorithm',
    parameters: [
      { name: 'algorithm', type: 'string', optional: false, description: 'gzip, zlib, flate, snappy, lz4, zstd' },
    ],
    returns: 'bytes',
    example: '"data".bytes().compress("gzip")',
  },
  {
    name: 'decompress',
    type: 'method',
    category: 'encoding',
    signature: '.decompress(algorithm: string) -> bytes',
    description: 'Decompresses bytes using specified algorithm',
    parameters: [{ name: 'algorithm', type: 'string', optional: false }],
    returns: 'bytes',
    example: 'this.compressed.decompress("gzip")',
  },
  {
    name: 'hash',
    type: 'method',
    category: 'encoding',
    signature: '.hash(algorithm: string) -> bytes',
    description: 'Computes hash of bytes',
    parameters: [
      { name: 'algorithm', type: 'string', optional: false, description: 'md5, sha1, sha256, sha512, xxhash64' },
    ],
    returns: 'bytes',
    example: '"hello".bytes().hash("sha256").encode("hex")',
  },
  {
    name: 'encrypt_aes',
    type: 'method',
    category: 'encoding',
    signature: '.encrypt_aes(key: string) -> bytes',
    description: 'Encrypts bytes using AES-GCM',
    parameters: [{ name: 'key', type: 'string', optional: false }],
    returns: 'bytes',
    example: '"secret".bytes().encrypt_aes(env("AES_KEY"))',
  },
  {
    name: 'decrypt_aes',
    type: 'method',
    category: 'encoding',
    signature: '.decrypt_aes(key: string) -> bytes',
    description: 'Decrypts AES-GCM encrypted bytes',
    parameters: [{ name: 'key', type: 'string', optional: false }],
    returns: 'bytes',
    example: 'this.encrypted.decrypt_aes(env("AES_KEY"))',
  },

  // Regex Methods
  {
    name: 're_match',
    type: 'method',
    category: 'regex',
    signature: '.re_match(pattern: string) -> bool',
    description: 'Returns true if string matches regex pattern',
    parameters: [{ name: 'pattern', type: 'string', optional: false }],
    returns: 'bool',
    example: '"hello123".re_match("[a-z]+[0-9]+")  # true',
  },
  {
    name: 're_find_all',
    type: 'method',
    category: 'regex',
    signature: '.re_find_all(pattern: string) -> array',
    description: 'Returns all matches of pattern in string',
    parameters: [{ name: 'pattern', type: 'string', optional: false }],
    returns: 'array<string>',
    example: '"a1b2c3".re_find_all("[0-9]")  # ["1", "2", "3"]',
  },
  {
    name: 're_find_object',
    type: 'method',
    category: 'regex',
    signature: '.re_find_object(pattern: string) -> object',
    description: 'Returns named capture groups as object',
    parameters: [{ name: 'pattern', type: 'string', optional: false }],
    returns: 'object',
    example: '"user:123".re_find_object("(?P<name>[a-z]+):(?P<id>[0-9]+)")  # {"name": "user", "id": "123"}',
  },
  {
    name: 're_find_all_object',
    type: 'method',
    category: 'regex',
    signature: '.re_find_all_object(pattern: string) -> array',
    description: 'Returns array of objects for all matches with named groups',
    parameters: [{ name: 'pattern', type: 'string', optional: false }],
    returns: 'array<object>',
    example: '"a:1,b:2".re_find_all_object("(?P<k>[a-z]):(?P<v>[0-9])")',
  },
  {
    name: 're_replace_all',
    type: 'method',
    category: 'regex',
    signature: '.re_replace_all(pattern: string, replacement: string) -> string',
    description: 'Replaces all matches of pattern with replacement',
    parameters: [
      { name: 'pattern', type: 'string', optional: false },
      { name: 'replacement', type: 'string', optional: false },
    ],
    returns: 'string',
    example: '"hello123".re_replace_all("[0-9]+", "XXX")  # "helloXXX"',
  },

  // Number Methods
  {
    name: 'abs',
    type: 'method',
    category: 'number',
    signature: '.abs() -> number',
    description: 'Returns absolute value',
    returns: 'number',
    example: '(-5).abs()  # 5',
  },
  {
    name: 'ceil',
    type: 'method',
    category: 'number',
    signature: '.ceil() -> int',
    description: 'Rounds up to nearest integer',
    returns: 'int',
    example: '3.2.ceil()  # 4',
  },
  {
    name: 'floor',
    type: 'method',
    category: 'number',
    signature: '.floor() -> int',
    description: 'Rounds down to nearest integer',
    returns: 'int',
    example: '3.8.floor()  # 3',
  },
  {
    name: 'round',
    type: 'method',
    category: 'number',
    signature: '.round() -> int',
    description: 'Rounds to nearest integer',
    returns: 'int',
    example: '3.5.round()  # 4',
  },
  {
    name: 'log',
    type: 'method',
    category: 'number',
    signature: '.log() -> number',
    description: 'Returns natural logarithm',
    returns: 'number',
    example: '10.log()  # 2.302...',
  },
  {
    name: 'log10',
    type: 'method',
    category: 'number',
    signature: '.log10() -> number',
    description: 'Returns base-10 logarithm',
    returns: 'number',
    example: '100.log10()  # 2',
  },

  // Comparison Methods
  {
    name: 'compare',
    type: 'method',
    category: 'comparison',
    signature: '.compare(other: any) -> int',
    description: 'Compares values: -1 (less), 0 (equal), 1 (greater)',
    parameters: [{ name: 'other', type: 'any', optional: false }],
    returns: 'int',
    example: '5.compare(3)  # 1',
  },
];

// ============================================================================
// Combined Registry
// ============================================================================

export const BLOBLANG_REFERENCE: BloblangItem[] = [...BLOBLANG_FUNCTIONS, ...BLOBLANG_METHODS];

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Get all items in a category
 */
export function getByCategory(category: BloblangCategory | 'functions' | 'all'): BloblangItem[] {
  if (category === 'all') {
    return BLOBLANG_REFERENCE;
  }
  if (category === 'functions') {
    return BLOBLANG_REFERENCE.filter((item) => item.type === 'function');
  }
  return BLOBLANG_REFERENCE.filter((item) => item.category === category);
}

/**
 * Search items by name or description
 */
export function searchBloblang(query: string): BloblangItem[] {
  const lowerQuery = query.toLowerCase();
  return BLOBLANG_REFERENCE.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.signature.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get a specific item by name
 */
export function getBloblangItem(name: string): BloblangItem | undefined {
  return BLOBLANG_REFERENCE.find((item) => item.name === name);
}

/**
 * List all available categories
 */
export function listCategories(): BloblangCategory[] {
  const categories = new Set<BloblangCategory>();
  for (const item of BLOBLANG_REFERENCE) {
    categories.add(item.category);
  }
  return Array.from(categories);
}

/**
 * Format items for display
 */
export function formatBloblangReference(items: BloblangItem[]): string {
  const lines: string[] = [];

  for (const item of items) {
    lines.push(`## ${item.name}`);
    lines.push(`Type: ${item.type} | Category: ${item.category}`);
    lines.push(`Signature: \`${item.signature}\``);
    lines.push(item.description);
    if (item.parameters && item.parameters.length > 0) {
      lines.push('Parameters:');
      for (const param of item.parameters) {
        const optional = param.optional ? '(optional)' : '(required)';
        const def = param.default ? `, default: ${param.default}` : '';
        lines.push(`  - ${param.name}: ${param.type} ${optional}${def}`);
        if (param.description) {
          lines.push(`    ${param.description}`);
        }
      }
    }
    lines.push(`Returns: ${item.returns}`);
    lines.push(`Example: \`${item.example}\``);
    lines.push('');
  }

  return lines.join('\n');
}
