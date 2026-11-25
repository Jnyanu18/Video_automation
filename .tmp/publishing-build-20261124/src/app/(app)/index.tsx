import React from 'react';
import { useRouter } from 'expo-router';
import NewReel from './new';
import { ProjectHistory } from '../../components/ProjectHistory';

/**
 * Home (Auto-Clipper): the same AI editing form as /new, so there is one wired form (multi-clip upload, the
 * creative-director queue, the live production panel), with the project gallery underneath.
 */
export default function Home() {
  const router = useRouter();
  return <NewReel footer={<ProjectHistory onCreateFilm={() => router.push('/new')} />} />;
}
