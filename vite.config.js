import path from 'node:path'
import os from 'node:os'
import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  cacheDir: path.join(process.env.TEMP || os.tmpdir(), 'aws-ec2-dashboard-vite-cache'),
  plugins: [react()],
})
