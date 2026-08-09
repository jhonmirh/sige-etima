import Shell from '@/components/Shell';
import RepresentativeForm from '@/components/RepresentativeForm';

type Props = {
  searchParams: Promise<{ studentId?: string | string[] }>;
};

export default async function NewRepresentative({ searchParams }: Props) {
  const params = await searchParams;
  const studentId = Array.isArray(params.studentId)
    ? params.studentId[0]
    : params.studentId;

  return (
    <Shell title="Nuevo representante">
      <RepresentativeForm mode="create" studentId={studentId} />
    </Shell>
  );
}
