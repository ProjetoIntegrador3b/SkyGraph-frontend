import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { resetSampleData } from '../services/api'

afterEach(() => {
  cleanup()
  // Each test starts against the API, not the sample data a previous test
  // fell back to.
  resetSampleData()
})
