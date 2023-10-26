// Copyright 2023, Require Security Inc, All Rights Reserved
declare namespace NodeJS {
  interface Process {
    binding(name: string) : object;
  }
}

// Typescript doesn't let you check if a Set<string> contains a string|number, which is just stupid and
// introduces extra checks everywhere.
interface Set<T> {
  has(value: unknown): boolean;
}

interface WeakSet<T> {
  has(value: unknown): boolean;
}

// Same for maps. Also you can totally try to get with an invalid type
// from a map -- you'll just get undefined
interface Map<K, V> {
  has(value: unknown): boolean;
  get(value: unknown): V | undefined
}

interface WeakMap<K, V> {
  has(value: unknown): boolean;
  get(value: unknown): V | undefined
}
