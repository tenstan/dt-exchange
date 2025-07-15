import { useCallback, useState } from "react"
import { getLocalStorage, setLocalStorage } from "../lib/local-storage"

export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
): [T, (newValue: T) => void] {
	let [state, _setState] = useState<T | null>(getLocalStorage<T>(key))

	let setState = useCallback(
		(value: T) => {
			setLocalStorage(key, value)
			_setState(value)
		},
		[key, _setState],
	)

	if (state == null && defaultValue != null) {
		setState(defaultValue)
	}

	return [state!, setState]
}
