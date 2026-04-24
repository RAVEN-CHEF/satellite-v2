'use client'
import { useState, useEffect, useCallback } from 'react'

/**
 * Hook para queries de Supabase con loading/error/refetch.
 * @param {Function} queryFn - función async que retorna { data, error }
 * @param {Array} deps - dependencias para re-ejecutar
 */
export function useSupabaseQuery(queryFn, deps = []) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await queryFn()
      if (result?.error) throw result.error
      setData(result?.data ?? result)
    } catch (err) {
      setError(err.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { execute() }, [execute])

  return { data, loading, error, refetch: execute }
}
