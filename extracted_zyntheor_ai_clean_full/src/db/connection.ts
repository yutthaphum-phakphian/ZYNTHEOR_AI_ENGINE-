// In-memory / Mock connection for Drizzle tasks route
export const db: any = {
  select: (_fields?: any) => ({
    from: (_table: any) => ({
      where: async (_condition?: any) => []
    })
  }),
  insert: (_table: any) => ({
    values: (vals: any) => ({
      returning: async () => [{ id: Date.now(), ...vals, createdAt: new Date(), updatedAt: new Date() }]
    })
  }),
  update: (_table: any) => ({
    set: (vals: any) => ({
      where: (_condition: any) => ({
        returning: async () => [{ id: 1, ...vals, updatedAt: new Date() }]
      })
    })
  }),
  delete: (_table: any) => ({
    where: (_condition: any) => ({
      returning: async () => [{ id: 1 }]
    })
  })
};
