export const mergeWhenDefined = (target, ...toBeMerged) => toBeMerged.reduce(
  (merged, nextToBeMerged) => ({
    ...merged,
    ...Object.entries(nextToBeMerged).reduce( 
      (definedValues, [key, value]) => ({
        ...definedValues,
        ...(value ? { [key]: value } : {}),
      }),
      {},
    ),
  }),
  { ...target },
)
