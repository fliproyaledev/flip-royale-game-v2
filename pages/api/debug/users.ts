import type { NextApiRequest, NextApiResponse } from 'next'
import { loadUsers, saveUsers } from '../../../lib/users'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const users = await loadUsers()

  if (req.query.delete) {
    const deleteId = String(req.query.delete)
    delete users[deleteId]
    await saveUsers(users)
    return res.json({ ok: true, deleted: deleteId })
  }

  res.json(users)
}
