import { Pipe, PipeTransform } from '@angular/core';
import { PrefixService } from './prefix.service';

@Pipe({
  name: 'prefix',
  standalone: true,
  pure: false
})
export class PrefixPipe implements PipeTransform {
  constructor(private prefixService: PrefixService) {}

  transform(value: string, type: 'child' | 'parent' | 'educator' = 'child', plural: boolean = false): string {
    let prefix = '';
    
    switch(type) {
      case 'child':
        prefix = this.prefixService.getChildPrefix();
        break;
      case 'parent':
        prefix = this.prefixService.getParentPrefix();
        break;
      case 'educator':
        prefix = this.prefixService.getEducatorPrefix();
        break;
    }

    if (plural && !prefix.endsWith('s')) {
      prefix += 's';
    }

    return prefix;
  }
}
