import { initialVehicles } from '@/lib/constants';
import { textoCombina, vehicleMatchesSearch } from '@/lib/search';

const tn01 = {
  tag: 'TN01',
  plate: 'FQQ-8B72',
  model: 'Chevrolet S-10',
  driver: 'Ana-Paula',
};

describe('busca da tag', () => {
  it.each(['TN01', 'TN1', 'tn01', 'tn1', 'TN-01', 'tn-1'])('TN01 responde a %s', (termo) => {
    expect(textoCombina(termo, 'TN01')).toBe(true);
  });

  it.each(['4', '04', '44', '41', '43'])('4 encontra a tag %s', (numero) => {
    expect(textoCombina('4', `TN${numero}`)).toBe(true);
  });

  it.each(['3', '03', '33', '31', '300'])('3 encontra a tag %s', (numero) => {
    expect(textoCombina('3', `TN${numero}`)).toBe(true);
  });

  it.each(['84', '64', '34', '74'])('4 não encontra a tag %s', (numero) => {
    expect(textoCombina('4', `TN${numero}`)).toBe(false);
  });

  it('placa, modelo e motorista não entram na busca', () => {
    expect(vehicleMatchesSearch(tn01, 'fqq8b72')).toBe(false);
    expect(vehicleMatchesSearch(tn01, 'FQQ-8B72')).toBe(false);
    expect(vehicleMatchesSearch(tn01, 's10')).toBe(false);
    expect(vehicleMatchesSearch(tn01, 's-10')).toBe(false);
    expect(vehicleMatchesSearch(tn01, 'anapaula')).toBe(false);
    expect(vehicleMatchesSearch(tn01, 'ana-paula')).toBe(false);
  });

  function tags(termo: string): string[] {
    return initialVehicles
      .filter((v) => vehicleMatchesSearch(v, termo))
      .map((v) => v.tag)
      .sort();
  }

  it('7 só traz a tag que começa com 7', () => {
    expect(tags('7')).toEqual(['TN72', 'TN73', 'TN74', 'TN76', 'TN78']);
  });

  it('2 só traz a tag que começa com 2', () => {
    expect(tags('2')).toEqual(['TN02', 'TN29']);
  });

  it('1 só traz a tag que começa com 1', () => {
    expect(tags('1')).toEqual(['TN01']);
  });

  it('3 só traz a tag que começa com 3', () => {
    expect(tags('3')).toEqual(['TN03', 'TN31']);
  });

  it('4 só traz a tag que começa com 4', () => {
    expect(tags('4')).toEqual(['TN04']);
  });
});
