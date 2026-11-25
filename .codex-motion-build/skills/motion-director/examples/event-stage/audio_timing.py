"""Pure cue ledger shared by the actual score synthesizer and retiming tests."""
def resolve_event_cues(project):
    fps=project['fps']
    cues=[]
    for event in project['events']:
        at=event['frame']/fps
        kinds=['whoosh'] if 'whoosh' in event['sound'] else []
        if 'impact' in event['sound']:kinds.append('impact')
        if event['sound']=='tick':kinds.append('tick')
        for kind in kinds:
            lead=18/fps if kind=='whoosh' else 0
            if at-lead<0:raise ValueError('Negative cue start; adjust the event ledger explicitly')
            cues.append({'eventId':event['id'],'targetFrame':event['frame'],'kind':kind,
                         'cueStartSeconds':at-lead,'sourceMarkerSeconds':lead,
                         'sourceMarker':'authored envelope crest' if kind=='whoosh' else 'authored attack onset',
                         'plannedOffsetFrames':0,
                         'evidence':'18-frame lead envelope, not noisy sample peak' if kind=='whoosh' else 'sample scheduling; attack ramp below1ms'})
    return cues
