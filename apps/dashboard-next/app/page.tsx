/**
 * Server component. Reads apps/dashboard/dist/data.json at build time (force-static)
 * and renders exactly what the builder produced. No fetch, no auth, no client state,
 * no derived metrics.
 */
import { loadDashboardView, renderValue, toCell, VIEW_GROUPS } from '../lib/dashboard-view';

export const dynamic = 'force-static';
export const revalidate = false;

export default function Page() {
  const view = loadDashboardView();

  return (
    <main>
      <header>
        <h1>STRATA — read-only dashboard</h1>
        <p className="provenance">
          Source metric: <code>{renderValue(view.source_metric)}</code>
          <span aria-hidden="true"> · </span>
          Generated at: <code>{renderValue(view.generated_at)}</code>
        </p>
        <p className="note">
          Displayed verbatim from <code>apps/dashboard/dist/data.json</code>. This page never
          recomputes a metric; unmeasured values are shown as <strong>NOT COMPUTABLE</strong>.
          All rows are sourced values, not assertions or gate decisions — including historical
          risk-acceptance fields.
        </p>
      </header>

      {VIEW_GROUPS.map(([key, title]) => (
        <section key={key} id={key}>
          <h2>{title}</h2>
          <table>
            <tbody>
              {Object.entries(view[key]).map(([field, value]) => (
                <tr key={field}>
                  <th scope="row">{field}</th>
                  <td>{toCell(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <footer>
        <p>
          Sources: <code>{toCell(view.sources)}</code>
        </p>
      </footer>
    </main>
  );
}
