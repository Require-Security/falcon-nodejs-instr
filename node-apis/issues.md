# Various Categorization issues

  - How do we handle native functions.  These seem to have the form:
    ```javascript
    realpath: [Function: realpath] { native: [Function (anonymous)] },
    realpathSync: [Function: realpathSync] { native: [Function (anonymous)] },
    ```
    from `require`.  I think this means that there is a function that you can
    call (eg, realpath) and that function has a field named `native` that is
    also a function.  I presume that is a native call.

  - How do we handle functions that return different types based on their
    arguments?  Currently we represent each of the types separated by
    vertical bars (|).  Typescript can figure out the actual return type
    based on parameters (at least in some cases).  I think when we
    create categorization files from typescript automatically we just
    create a list for each possible return type.

  - undefined return types.  In some cases the typescript may define a
    type that is not defined in JavaScript.  If this types is uninteresting
    to us, we may specify it in our categorization file without defining
    it.  In this case, we should just presume this type is uninteresting.

  - anonymous return types.  In some cases a function may return an
    anonymous object with some specified fields.  It seems unlikely that
    we will ever want to proxy these returned objects, so these can
    safely be ignored by the instrumentor.

