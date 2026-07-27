import {
  calcularPath,
  descendentesDe,
  filhosDe,
  migrarDaV1,
  podeExcluir,
  reconstruirPaths,
  trilha,
  validarUnidade,
  ORG_LEVEL_FIELDS,
} from '@/lib/org';
import { initialOrgUnits } from '@/lib/constants';
import { OrgUnit, ORG_LEVELS, ORG_PARENT_LEVEL } from '@/types';

describe('árvore organizacional — Regional > Gerência > Coordenação > Gestão > Área', () => {
  it('a semente traz os cinco níveis e todos os pais são do nível esperado', () => {
    for (const level of ORG_LEVELS) {
      expect(initialOrgUnits.filter((u) => u.level === level).length).toBeGreaterThan(0);
    }

    for (const u of initialOrgUnits) {
      const esperado = ORG_PARENT_LEVEL[u.level];
      if (esperado === null) {
        expect(u.parentId).toBeNull();
      } else {
        const pai = initialOrgUnits.find((p) => p.id === u.parentId);
        expect(pai?.level).toBe(esperado);
      }
    }
  });

  it('o path materializado bate com a subida real até a raiz', () => {
    const recalculadas = reconstruirPaths(initialOrgUnits);
    for (const u of recalculadas) {
      const original = initialOrgUnits.find((o) => o.id === u.id)!;
      expect(u.path).toEqual(original.path);
    }

    const area = initialOrgUnits.find((u) => u.id === 'area-infratech-no')!;
    expect(area.path).toEqual(['reg-carajas', 'ger-log', 'coord-log-n', 'gest-log-frota']);
    expect(trilha(initialOrgUnits, area)).toContain('Regional Carajás');
    expect(trilha(initialOrgUnits, area).endsWith('Infratech-No')).toBe(true);
  });

  it('descendentesDe devolve a subárvore inteira, incluindo o próprio nó', () => {
    const sub = descendentesDe(initialOrgUnits, 'ger-log').map((u) => u.id);
    expect(sub).toContain('ger-log');
    expect(sub).toContain('coord-log-n');
    expect(sub).toContain('gest-log-frota');
    expect(sub).toContain('area-infratech-no');
    expect(sub).not.toContain('ger-man');
  });

  it('não entra em laço infinito se o parentId formar um ciclo', () => {
    // Uma edicao manual no console do Firestore pode criar isto. Sem a trava
    // de profundidade, `calcularPath` travaria a aba do usuario.
    const ciclicas: OrgUnit[] = [
      {
        id: 'a',
        level: 'regional',
        name: 'A',
        code: 'A',
        parentId: 'b',
        path: [],
        createdAt: '',
        attrs: {},
      },
      {
        id: 'b',
        level: 'regional',
        name: 'B',
        code: 'B',
        parentId: 'a',
        path: [],
        createdAt: '',
        attrs: {},
      },
    ];
    const path = calcularPath(ciclicas, 'a');
    expect(path.length).toBeLessThanOrEqual(10);
  });

  it('recusa excluir uma unidade que ainda sustenta outras', () => {
    expect(podeExcluir(initialOrgUnits, 'ger-log').ok).toBe(false);
    expect(podeExcluir(initialOrgUnits, 'area-infratech-no').ok).toBe(true);
  });

  it('filhosDe só devolve o nível imediatamente abaixo', () => {
    const filhos = filhosDe(initialOrgUnits, 'reg-carajas');
    expect(filhos.every((f) => f.level === 'gerencia')).toBe(true);
    expect(filhos.map((f) => f.id).sort()).toEqual(['ger-log', 'ger-man']);
  });
});

describe('validação de unidade', () => {
  const base = { name: 'Nova', code: 'NOVA-01', parentId: 'ger-log' as string | null };

  it('exige nome, código e pai do nível correto', () => {
    expect(
      validarUnidade(
        initialOrgUnits,
        { ...base, level: 'coordenacao', name: '' },
        {
          coordenador: 'X',
        }
      )
    ).toContain('O nome é obrigatório.');

    // Uma coordenacao pendurada numa regional pularia um nivel inteiro da
    // hierarquia - e o filtro por gerencia deixaria de encontra-la.
    const erros = validarUnidade(
      initialOrgUnits,
      { ...base, level: 'coordenacao', parentId: 'reg-carajas' },
      { coordenador: 'X' }
    );
    expect(erros.some((e) => /só pode pertencer/i.test(e))).toBe(true);
  });

  it('recusa código repetido', () => {
    const erros = validarUnidade(
      initialOrgUnits,
      { ...base, level: 'coordenacao', code: 'crd-logn' },
      { coordenador: 'X' }
    );
    expect(erros).toContain('Já existe uma unidade com este código.');
  });

  it('cobra os atributos obrigatórios do nível', () => {
    // A area sem `registroFrota` e o caso mais grave: e esse codigo que
    // delimita quem troca mensagem com quem.
    const erros = validarUnidade(
      initialOrgUnits,
      { name: 'Área X', code: 'AX-1', parentId: 'gest-log-frota', level: 'area' },
      {}
    );
    expect(erros.some((e) => /Área de registro da frota/i.test(e))).toBe(true);
  });

  it('todo nível declara ao menos um atributo próprio', () => {
    for (const level of ORG_LEVELS) {
      expect(ORG_LEVEL_FIELDS[level].length).toBeGreaterThan(0);
    }
  });
});

describe('migração do formato v1', () => {
  it('promove regionais e gerências e completa os três níveis que faltavam', () => {
    const units = migrarDaV1(
      [{ id: 'r1', name: 'R1', code: 'R1', createdAt: '2026-01-01', description: 'd' }],
      [
        {
          id: 'g1',
          regionalId: 'r1',
          name: 'G1',
          code: 'G1',
          responsible: 'Fulano',
          createdAt: '2026-01-02',
        },
      ]
    );

    for (const level of ORG_LEVELS) {
      expect(units.filter((u) => u.level === level).length).toBe(1);
    }

    // Os ids originais sao preservados: os veiculos ja gravados apontam para
    // eles, e troca-los desvincularia a frota inteira da estrutura.
    expect(units.find((u) => u.level === 'regional')!.id).toBe('r1');
    expect(units.find((u) => u.level === 'gerencia')!.id).toBe('g1');
    expect(units.find((u) => u.level === 'gerencia')!.attrs.gerente).toBe('Fulano');

    const area = units.find((u) => u.level === 'area')!;
    expect(area.path).toEqual(['r1', 'g1', 'g1-coord-padrao', 'g1-gest-padrao']);
    expect(area.attrs.registroFrota).toBe('Infratech-No');
  });
});
