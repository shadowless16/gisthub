import { useState } from "react"
import { User } from "@/types/user"

export function useSearchUsers() {
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data.users || [])
    } catch (err) {
      setError("Failed to search users")
    } finally {
      setLoading(false)
    }
  }

  return { results, loading, error, search }
}
