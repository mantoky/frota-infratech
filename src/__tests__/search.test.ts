import { initialVehicles } from '@/lib/constants';
import { textoCombina, vehicleMatchesSearch } from '@/lib/search';

const tn01 = {
  tag: 'TN01',
  plate: 'FQQ-8B72',
  model: 'Chevrolet S-10',
  driver: 'Ana-Paula',
};

describe('busca da tag TN01', () => {
  it.each(['TN01', 'TN1', 'tn01', 'tn1', 'TN-01', 'tn-1'])('TN01 responde a %s', (termo) => {
    expect(textoCombina(termo, 'TN01')).toBe(true);
  });

  it.each(['tn2', 'tn10', 'tn31', 'tn11'])('TN1 não puxa outro número: %s', (termo) => {
    expect(textoCombina(termo, 'TN01')).toBe(false);
    expect(textoCombina('tn1', `TN${termo.slice(2).padStart(2, '0')}`)).toBe(false);
  });

  it('TN10 responde a tn10 e não a tn1', () => {
    expect(textoCombina('tn10', 'TN10')).toBe(true);
    expect(textoCombina('tn-10', 'TN10')).toBe(true);
    expect(textoCombina('tn1', 'TN10')).toBe(false);
  });

  it('a mesma leitura vale para placa, modelo e motorista', () => {
    expect(vehicleMatchesSearch(tn01, 'fqq8b72')).toBe(true);
    expect(vehicleMatchesSearch(tn01, 'FQQ-8B72')).toBe(true);
    expect(vehicleMatchesSearch(tn01, 's10')).toBe(true);
    expect(vehicleMatchesSearch(tn01, 's-10')).toBe(true);
    expect(vehicleMatchesSearch(tn01, 'anapaula')).toBe(true);
    expect(vehicleMatchesSearch(tn01, 'ana-paula')).toBe(true);
    expect(textoCombina('std12', 'STD-0012')).toBe(true);
    expect(textoCombina('std0012', 'STD-0012')).toBe(true);
  });

  it('um pedaço de texto continua valendo quando não é um código', () => {
    expect(textoCombina('hilux', 'Toyota Hilux')).toBe(true);
    expect(textoCombina('8b72', 'FQQ-8B72')).toBe(true);
    expect(textoCombina('01', 'TN01')).toBe(true);
  });
});

describe('número curto', () => {
  it.each(['4', '04', '44', '41', '49', '40'])('4 encontra %s', (numero) => {
    expect(textoCombina('4', numero)).toBe(true);
  });

  it.each(['84', '64', '34', '14', '74'])('4 não encontra o dígito no fim de %s', (numero) => {
    expect(textoCombina('4', numero)).toBe(false);
  });

  function tags(termo: string): string[] {
    return initialVehicles
      .filter((v) => vehicleMatchesSearch(v, termo))
      .map((v) => v.tag)
      .sort();
  }

  it('4 não traz placa que só termina em 4', () => {
    expect(tags('4')).toEqual(['TN04', 'TN73', 'TN78']);
  });

  it('8 não traz o 8 do final de 18, 28, 68 ou 78', () => {
    expect(tags('8')).toEqual(['TN01', 'TN02', 'TN29', 'TN88']);
  });

  it('5 não traz o 5 do final de 75', () => {
    expect(tags('5')).toEqual([]);
  });

  it('3 traz quem começa com 3 e deixa de fora o 23', () => {
    expect(tags('3')).toEqual(['TN03', 'TN04', 'TN31', 'TN73', 'TN74']);
  });
});
